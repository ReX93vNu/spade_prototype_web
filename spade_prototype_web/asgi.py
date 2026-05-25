"""
ASGI config for spade_prototype_web project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

# 1. Force set the settings environment module variable
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'spade_prototype_web.settings')

# 2. Trigger the standard Django initialization engine immediately
django_asgi_app = get_asgi_application()

# 3. CRITICAL: Import your local channels components ONLY after get_asgi_application() has run!
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import core.routing  

# 4. Define the routing stack
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            core.routing.websocket_urlpatterns
        )
    ),
})
