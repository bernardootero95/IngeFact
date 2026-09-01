from slowapi import Limiter
from slowapi.util import get_remote_address

# Storage en memoria del proceso -- suficiente mientras el backend corra en un
# solo proceso/instancia (sin Celery/Redis todavia, ver memoria del proyecto).
# Si en el futuro se despliega con varias instancias detras de un balanceador,
# esto debe migrar a un backend compartido (ej. Redis) o el limite se podria
# esquivar rotando de instancia.
limiter = Limiter(key_func=get_remote_address)
