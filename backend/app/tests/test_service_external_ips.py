from app.repositories.check_run_repository import create_check_run, complete_check_run, fail_check_run
from app.repositories.service_repository import save_service
from app.collectors.service_collector import collect_services
from app.repositories.service_external_ips_repository import save_service_external_ips
from app.collectors.service_external_ips_collector import collect_service_external_ips
from app.database.connection import SessionLocal

db = SessionLocal()

try: 
    namespace = "bim"
    check_run = create_check_run(db, namespace=namespace)
    
    try: 
        services = collect_services(namespace=namespace)
        saved_services = save_service(db, check_run_id=check_run.id, services=services)
        for service in saved_services:
            list_external_ips = collect_service_external_ips(namespace=namespace, service_name=service.service_name)
            save_service_external_ips(db, service.id, list_external_ips)
        complete_check_run(db, check_run=check_run)
    except Exception as e: 
        fail_check_run(db, check_run=check_run, error=e)
        raise

finally: 
    db.close()