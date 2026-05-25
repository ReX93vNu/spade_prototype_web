from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/updates/<int:user_id>/', consumers.FertilizerDataConsumer.as_asgi()),
]