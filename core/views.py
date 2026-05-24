from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import FertilizerLog, User
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class IngestReadingView(APIView):
    def post(self, request):
        data = request.data
        event_type = data.get("event_type")
        
        if not event_type:
            return Response({"status": "Rejected", "error": "Missing event_type tag."}, status=status.HTTP_400_BAD_REQUEST)
        
        if event_type == "sensor_log":
            try:
                #  Reads the  user_id the ESP32 is sending
                user_id = data.get("user_id")
                if not user_id:
                    return Response({"status": "Rejected", "error": "Missing user_id parameter from device payload."}, status=status.HTTP_400_BAD_REQUEST)
                
                # Verifies if the user exists 
                user = User.objects.get(id=user_id)

                # Saves the entry as a log to that user
                log = FertilizerLog.objects.create(
                    user=user,
                    fertilizer_type=data.get("fertilizer_type", "Hardware Node Reading"),
                    ph_level=float(data.get("ph_level")),
                    nitrogen_val=float(data.get("nitrogen_val")),
                    phosphorus_val=float(data.get("phosphorus_val")),
                    potassium_val=float(data.get("potassium_val"))
                )

                payload = {
                    "id": log.id,
                    "event_type": "new_log_entry",
                    "timestamp": log.timestamp.isoformat(),
                    "ph_level": log.ph_level,
                    "nitrogen_val": log.nitrogen_val,
                    "phosphorus_val": log.phosphorus_val,
                    "potassium_val": log.potassium_val,
                    "condition_status": log.condition_status
                }

                # Targets only this specific user's  websocket group
                target_group = f"user_{user_id}_updates"
                
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    target_group, # Sends only to "user_1_updates", "user_2_updates", etc.
                    {
                        "type": "send_live_reading",
                        "data": payload
                    }
                )

                return Response({"status": "Logged Successfully", "data": payload}, status=status.HTTP_201_CREATED)
            
            except User.DoesNotExist:
                return Response({"status": "Data Error", "error": f"User ID {user_id} does not exist in backend database."}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError) as e:
                return Response({"status": "Data Error", "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        elif event_type == "device_heartbeat":
            return Response({"status": "Acknowledged", "message": "Device heartbeat verified."}, status=status.HTTP_200_OK)
            
        return Response({"status": "Ignored", "error": "Unknown category tag"}, status=status.HTTP_400_BAD_REQUEST)