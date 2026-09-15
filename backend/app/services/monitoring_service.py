from app.repositories.check_run_repository import create_check_run, complete_check_run, fail_check_run
from app.collectors.pod_collector import collect_pods
from app.collectors.deployment_collector import collect_deployments
from app.collectors.node_collector import collect_node
from app.collectors.service_collector import collect_services
from app.collectors.replicaset_collector import collect_replicaset
from app.collectors.statefulset_collector import collect_statefulset
from app.collectors.daemonset_collector import collect_daemonsets
from app.repositories.pod_repository import save_pods
from app.repositories.deployment_repository import save_deployments
from app.repositories.node_repository import save_nodes
from app.repositories.service_repository import save_service
from app.repositories.service_cluster_ips_repository import save_service_cluster_ips
from app.repositories.service_external_ips_repository import save_service_external_ips
from app.repositories.service_ports_repository import save_service_ports
from app.repositories.replicaset_repository import save_replicaset
from app.repositories.statefulset_repository import save_statefulset
from app.repositories.daemonset_repository import save_daemonsets

def run_monitoring(db, namespace): 
    check_run = create_check_run(db, namespace=namespace)
    try: 
        # Save NODE 
        nodes = collect_node()
        save_nodes(db, check_run_id=check_run.id, nodes=nodes)
        
        # Save POD
        pods = collect_pods(namespace=namespace)
        save_pods(db, check_run_id=check_run.id, pods=pods)
        
        # Save DEPLOYMENT
        deployments = collect_deployments(namespace=namespace)
        save_deployments(db, check_run_id=check_run.id, deployments=deployments)
        
        # Save SERVICE 
        services = collect_services(namespace=namespace)
        saved_services = save_service(db, check_run_id=check_run.id, services=services)
        
        for service, saved_service in zip(services, saved_services): 
            save_service_cluster_ips(db, service_id=saved_service.id, list_cluster_ip=service["cluster_ips"])
            save_service_external_ips(db, service_id=saved_service.id, list_external_ip=service["external_ips"])
            save_service_ports(db, service_id=saved_service.id, list_service_port=service["ports"])
        
        # Save REPLICASET 
        replicasets = collect_replicaset(namespace=namespace)
        save_replicaset(db, check_run_id=check_run.id, replicasets=replicasets)
        
        # Save STATEFULSET 
        statefulsets = collect_statefulset(namespace=namespace)
        save_statefulset(db, check_run_id=check_run.id, statefulsets=statefulsets)
        
        # Save DAEMONSET 
        daemonsets = collect_daemonsets(namespace=namespace)
        save_daemonsets(db, check_run_id=check_run.id, daemonsets=daemonsets)
        
        complete_check_run(db, check_run=check_run)
        db.commit()
        return check_run 
    except Exception as e: 
        db.rollback()
        fail_check_run(db, check_run=check_run, error=e)
        raise