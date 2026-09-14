from app.config.k8s_config import core_v1

def collect_service_external_ips(namespace, service_name): 
    results = []
    services = core_v1.list_namespaced_service(namespace=namespace)
    for service in services.items: 
        if service.metadata.name == service_name: 
            external_ip_handwork = service.spec.external_ips
            if external_ip_handwork:
                results.append(external_ip_handwork)
            else: 
                ingress = service.status.load_balancer.ingress 
                if ingress: 
                    for external_ip in ingress: 
                        results.append(external_ip.ip)
                        
    return results

                