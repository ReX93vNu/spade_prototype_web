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

    # get for frontend
    def get(self, request):
        try:
            # Fetch all logs tied to the logged-in user, ordered by newest first
            logs = FertilizerLog.objects.all().order_by('-timestamp')
            
            # Map the database records into a clean JSON array structure matching your Postman/WebSocket payloads
            historical_data = []
            for log in logs:
                historical_data.append({
                    "id": log.id,
                    "event_type": "historical_log_entry",
                    "assigned_to": log.user.username,
                    "timestamp": log.timestamp.isoformat(),
                    "fertilizer_type": log.fertilizer_type,
                    "ph_level": log.ph_level,
                    "nitrogen_val": log.nitrogen_val,
                    "phosphorus_val": log.phosphorus_val,
                    "potassium_val": log.potassium_val,
                    "condition_status": log.condition_status
                })
                
            return Response({
                "status": "Success",
                "total_records": len(historical_data),
                "data": historical_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "status": "Server Error", 
                "error": f"Failed to retrieve data: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # post for the incoming payloads of records
    def post(self, request):
        data = request.data
        authenticated_user = request.user
        channel_layer = get_channel_layer()
        target_group = f"user_{authenticated_user.id}_updates"

        #  bulk batch transmission to handle multiple logs (JSON Array) 
        if isinstance(data, list):
            if not data:
                return Response({"status": "Rejected", "error": "Empty batch list provided."}, status=status.HTTP_400_BAD_REQUEST)
            
            synced_payloads = []
            try:
                for item in data:
                    # Enforce event tag check inside the array list
                    if item.get("event_type") != "sensor_log":
                        continue # Skip device heartbeats or unknown tags within a bulk sensor block
                    
                    log = FertilizerLog.objects.create(
                        user=authenticated_user,
                        fertilizer_type=item.get("fertilizer_type", "ESP32 Bulk Sync Log"),
                        ph_level=float(item.get("ph_level")),
                        nitrogen_val=float(item.get("nitrogen_val")),
                        phosphorus_val=float(item.get("phosphorus_val")),
                        potassium_val=float(item.get("potassium_val"))
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

                    # Broadcast real-time refresh packet to React frontend via WebSockets per entry
                    async_to_sync(channel_layer.group_send)(
                        target_group,
                        {
                            "type": "send_live_reading",
                            "data": payload
                        }
                    )
                    synced_payloads.append(payload)

                return Response({
                    "status": "Batch Logged Successfully", 
                    "records_synced": len(synced_payloads),
                    "data": synced_payloads
                }, status=status.HTTP_201_CREATED)

            except (ValueError, TypeError) as e:
                return Response({"status": "Data Error", "error": f"Value processing failed in batch: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # for single record payloads (Standard JSON Object) 
        else:
            event_type = data.get("event_type")
            
            if not event_type:
                return Response({"status": "Rejected", "error": "Missing event_type tag."}, status=status.HTTP_400_BAD_REQUEST)
            
            if event_type == "sensor_log":
                try:
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