from rest_framework.permissions import BasePermission

class IsVerifiedAgent(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        agent = getattr(user, 'agent', None)
        if agent is None:
            return False

        return agent.is_verified
