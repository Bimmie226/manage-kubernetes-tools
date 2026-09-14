from app.config.k8s_config import core_v1

def collect_service_cluster_ips(namespace, service_name): 
    services = core_v1.list_namespaced_service(namespace=namespace)
    
    results = []
    for service in services.items: 
        if service.metadata.name == service_name: 
            svc_cluster_ip = service.spec.cluster_ips 
            for i in range(len(svc_cluster_ip)): 
                results.append(svc_cluster_ip[i])
                
    return results

