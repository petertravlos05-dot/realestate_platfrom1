from django.contrib import admin
from .models import Seller, Buyer, Agent, Property, Transaction

admin.site.register(Seller)
admin.site.register(Buyer)
admin.site.register(Agent)
admin.site.register(Property)
admin.site.register(Transaction)
