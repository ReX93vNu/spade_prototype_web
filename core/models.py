from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """Custom user model for secure authentication controls."""
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='spade_user_set',
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='spade_user_permissions_set',
        blank=True
    )

class FertilizerLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fertilizer_logs')
    fertilizer_type = models.CharField(max_length=100, default="Organic Baseline")
    timestamp = models.DateTimeField(auto_now_add=True)
    ph_level = models.FloatField()
    nitrogen_val = models.FloatField()
    phosphorus_val = models.FloatField()
    potassium_val = models.FloatField()
    condition_status = models.CharField(max_length=50, blank=True)

    def save(self, *args, **kwargs):
        # Automated evaluation logic
        if 6.0 <= self.ph_level <= 7.5:
            self.condition_status = "Optimal"
        else:
            self.condition_status = "Suboptimal"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Log {self.id} - {self.fertilizer_type}"
