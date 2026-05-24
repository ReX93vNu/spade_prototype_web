from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, FertilizerLog

admin.site.register(User, UserAdmin)

@admin.register(FertilizerLog)
class FertilizerLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'fertilizer_type', 'nitrogen_val', 'phosphorus_val', 'potassium_val', 'ph_level', 'condition_status', 'timestamp')
    list_filter = ('condition_status', 'fertilizer_type')
