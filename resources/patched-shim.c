// SPDX-License-Identifier: GPL-2.0
/*
 * waydroid-setup: shim for building the kernel's own in-tree binder out of tree.
 * It resolves the symbols the driver uses but this kernel does not export to
 * modules — via kallsyms/kprobe (the same trick as anbox's deps.c) — and
 * redirects init_ipc_ns. The driver sources themselves are not modified. If a
 * future kernel needs a different set, the build fails at modpost with an
 * "undefined!" list; add the symbols here.
 *
 * Deployed by home.nix to ~/.local/share/waydroid-setup/shim.c (+ shim.h).
 */
#include <linux/module.h>
#include <linux/kprobes.h>
#include <linux/sched.h>
#include <linux/ipc_namespace.h>
#include <linux/list_lru.h>
#include <linux/mm.h>
#include <linux/mmap_lock.h>
#include <linux/security.h>
#include <linux/task_work.h>
#include <linux/wait.h>
#include <linux/fdtable.h>

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Android binder IPC (in-tree driver built out of tree)");

struct ipc_namespace *binder_shim_init_ipc_ns;

#define SHIM(ret, name, args, call)				\
	static typeof(&name) p_##name;				\
	ret name args { return p_##name call; }

#define SHIM_VOID(name, args, call) static typeof(&name) p_##name; void name args { p_##name call; }

SHIM(int, can_nice, (const struct task_struct *p, const int nice), (p, nice))
SHIM(bool, list_lru_del, (struct list_lru *lru, struct list_head *item, int nid,
			  struct mem_cgroup *memcg), (lru, item, nid, memcg))
SHIM(struct vm_area_struct *, lock_vma_under_rcu,
     (struct mm_struct *mm, unsigned long address), (mm, address))
SHIM_VOID(put_ipc_ns, (struct ipc_namespace *ns), (ns))
SHIM(int, security_binder_transaction, (const struct cred *from,
					const struct cred *to), (from, to))
SHIM(int, security_binder_transfer_binder, (const struct cred *from,
					    const struct cred *to), (from, to))
SHIM(int, security_binder_set_context_mgr, (const struct cred *mgr), (mgr))
SHIM(int, security_binder_transfer_file, (const struct cred *from,
					  const struct cred *to, const struct file *file),
     (from, to, file))
SHIM(struct file *, file_close_fd, (unsigned int fd), (fd))
SHIM(int, task_work_add, (struct task_struct *task, struct callback_head *twork,
			  enum task_work_notify_mode mode), (task, twork, mode))
SHIM_VOID(__wake_up_pollfree, (struct wait_queue_head *wq_head), (wq_head))

SHIM_VOID(zap_page_range_single, (struct vm_area_struct *vma, unsigned long address, unsigned long size, struct zap_details *details), (vma, address, size, details))
SHIM(bool, list_lru_add, (struct list_lru *lru, struct list_head *item, int nid, struct mem_cgroup *memcg), (lru, item, nid, memcg))
static int __init binder_shim_init(void)
{
	struct kprobe kp = { .symbol_name = "kallsyms_lookup_name" };
	unsigned long (*lookup)(const char *);
	int ret;

	ret = register_kprobe(&kp);
	if (ret)
		return ret;
	lookup = (typeof(lookup))kp.addr;
	unregister_kprobe(&kp);

#define RESOLVE(var, sym) do {						\
		var = (typeof(var))lookup(sym);				\
		if (!var) {						\
			pr_err("binder: symbol %s not found\n", sym);	\
			return -ENOENT;					\
		}							\
	} while (0)
	RESOLVE(binder_shim_init_ipc_ns, "init_ipc_ns");
	RESOLVE(p_can_nice, "can_nice");
	RESOLVE(p_list_lru_del, "list_lru_del");
	RESOLVE(p_lock_vma_under_rcu, "lock_vma_under_rcu");
	RESOLVE(p_put_ipc_ns, "put_ipc_ns");
	RESOLVE(p_security_binder_transaction, "security_binder_transaction");
	RESOLVE(p_security_binder_transfer_binder, "security_binder_transfer_binder");
	RESOLVE(p_security_binder_set_context_mgr, "security_binder_set_context_mgr");
	RESOLVE(p_security_binder_transfer_file, "security_binder_transfer_file");
	RESOLVE(p_file_close_fd, "file_close_fd");
	RESOLVE(p_task_work_add, "task_work_add");
	RESOLVE(p___wake_up_pollfree, "__wake_up_pollfree");
	RESOLVE(p_zap_page_range_single, "zap_page_range_single");
	RESOLVE(p_list_lru_add, "list_lru_add");
	return 0;
}

/* binder.c registers binder_init via device_initcall(); Kbuild renames its
 * init_module alias so the symbols can be resolved first. */
int binder_orig_init_module(void);

static int __init binder_shim_module_init(void)
{
	int ret = binder_shim_init();

	return ret ? ret : binder_orig_init_module();
}
module_init(binder_shim_module_init);
