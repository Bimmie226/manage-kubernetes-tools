from app.config.k8s_config import core_v1

def collect_service_ports(namespace, service_name): 
    results = []
    services = core_v1.list_namespaced_service(namespace=namespace)
    for service in services.items: 
        if service.metadata.name == service_name: 
            for i in range(len(service.spec.ports)): 
                if service.spec.ports[i].node_port: 
                    results.append({"port": service.spec.ports[i].port, "node_port": service.spec.ports[i].node_port, "protocol": service.spec.ports[i].protocol})
                else: 
                    results.append({"port": service.spec.ports[i].port, "protocol": service.spec.ports[i].protocol})
                
    return results
