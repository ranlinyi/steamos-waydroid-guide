/* Force-included into every object: init_ipc_ns is data, not exported,
 * so turn it into a pointer resolved at load time. */
#define init_ipc_ns (*binder_shim_init_ipc_ns)
