from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated  
from .models import FertilizerLog
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class IngestReadingView(APIView):
    # Enforce token security. Unauthenticated requests get rejected with 401 Unauthorized.
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        event_type = data.get("event_type")
        
        if not event_type:
            return Response({"status": "Rejected", "error": "Missing event_type tag."}, status=status.HTTP_400_BAD_REQUEST)
        
        if event_type == "sensor_log":
            try:
                # DYNAMIC & SECURE: Extracted directly from the encrypted JWT token signature
                authenticated_user = request.user

                # Saves the entry as a log assigned directly to this token-verified user account
                log = FertilizerLog.objects.create(
                    user=authenticated_user,
                    fertilizer_type=data.get("fertilizer_type", "Hardware Node Reading"),
                    ph_level=float(data.get("ph_level")),
                    nitrogen_val=float(data.get("nitrogen_val")),
                    phosphorus_val=float(data.get("phosphorus_val")),
                    potassium_val=float(data.get("potassium_val"))
                )

                payload = {
                    "id": log.id,
                    "event_type": "new_log_entry",
                    "assigned_to": authenticated_user.username,
                    "timestamp": log.timestamp.isoformat(),
                    "ph_level": log.ph_level,
                    "nitrogen_val": log.nitrogen_val,
                    "phosphorus_val": log.phosphorus_val,
                    "potassium_val": log.potassium_val,
                    "condition_status": log.condition_status
                }

                # Targets only this specific user's private WebSocket group channel
                target_group = f"user_{authenticated_user.id}_updates"
                
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    target_group,
                    {
                        "type": "send_live_reading",
                        "data": payload
                    }
                )

                return Response({"status": "Logged Successfully", "data": payload}, status=status.HTTP_201_CREATED)
            
            except (ValueError, TypeError) as e:
                return Response({"status": "Data Error", "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        elif event_type == "device_heartbeat":
            return Response({"status": "Acknowledged", "message": "Device heartbeat verified."}, status=status.HTTP_200_OK)
            
        return Response({"status": "Ignored", "error": "Unknown category tag"}, status=status.HTTP_400_BAD_REQUEST)