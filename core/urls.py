from django.urls import path
from .views import IngestReadingView

urlpatterns = [
    path('ingest-reading/', IngestReadingView.as_view(), name='ingest_reading'),
]