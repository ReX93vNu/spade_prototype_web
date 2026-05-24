import json
from channels.generic.websocket import AsyncWebsocketConsumer

class FertilizerDataConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Check if user is authenticated via Django's session middleware
        self.user = self.scope.get("user")
        
        if self.user and self.user.is_authenticated:
            # Create a private room name specific to this user's ID 
            self.group_name = f"user_{self.user.id}_updates"
            
            # Join their private room channel group
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
        else:
            # Reject connection if they arent logged into the website
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def send_live_reading(self, event):
        # Push data to the user's front-end dashboard
        await self.send(text_data=json.dumps(event["data"]))