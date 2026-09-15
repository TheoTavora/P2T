

from django.urls import path
from . import views
from .views import home

urlpatterns = [
    path("", home, name="home"),
    path("chatbot/", views.chatbot_view, name="chatbot_view"),
    path("responder/", views.responder, name="responder"),
]
