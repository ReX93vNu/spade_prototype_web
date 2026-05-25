import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model  # Dynamic user model hook
from channels.db import database_sync_to_async

# Fetch the exact custom user model defined as 'core.User' in settings.py
User = get_user_model()

class FertilizerDataConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Parse JWT token from URL query string
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        raw_jwt_token = query_params.get("token", [None])[0]

        # Authenticate connection
        self.user = await self.get_user_from_jwt(raw_jwt_token)
        
        if self.user and self.user.is_authenticated:
            # Join user-specific channel group
            self.group_name = f"user_{self.user.id}_updates"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            print(f"WebSocket Connected: User {self.user.username}")
        else:
            print("WebSocket Rejected: Invalid or missing JWT handshake.")
            await self.close()

    async def disconnect(self, close_code):
        # Leave channel group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            print(f"WebSocket Disconnected: Code {close_code}")

    async def receive(self, text_data):
        pass

    async def send_live_reading(self, event):
        # Send data payload to React frontend
        await self.send(text_data=json.dumps(event["data"]))

    @database_sync_to_async
    def get_user_from_jwt(self, token_string):
        if not token_string:
            return None
        try:
            # Decode token and look up custom User model entry
            validated_token = AccessToken(token_string)
            user_id = validated_token["user_id"]
            return User.objects.get(id=user_id)
        except Exception as e:
            # Added a print tracker here so you can catch expired token errors directly
            print(f"JWT Consumer Verification Exception: {e}")
            return None