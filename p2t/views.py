import json
import os

import requests
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

SEMANTIC_API_URL = os.getenv("SEMANTIC_API_URL", "http://127.0.0.1:5000/responder")

def home(request): return render(request,"home.html")

def chatbot_view(request):
    return render(request, "chatbot.html")

@csrf_exempt
@require_POST
def responder(request):
    pergunta = request.POST.get("pergunta")
    if not pergunta:
        # também aceita JSON se quiser
        try:
            body = json.loads(request.body or "{}")
            pergunta = body.get("pergunta")
        except Exception:
            pass

    if not pergunta:
        return JsonResponse({"erro": "Pergunta não recebida"}, status=400)

    try:
        r = requests.post(SEMANTIC_API_URL, json={"pergunta": pergunta}, timeout=10)
        r.raise_for_status()
        return JsonResponse(r.json(), status=r.status_code, safe=True)
    except requests.exceptions.JSONDecodeError:
        return JsonResponse({"erro": "Resposta inválida do serviço"}, status=502)
    except requests.RequestException as e:
        return JsonResponse({"erro": "Serviço indisponível", "detalhe": str(e)}, status=502)
