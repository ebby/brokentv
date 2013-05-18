from common import *

class Invite(db.Model):
    id = db.StringProperty()
    email = db.StringProperty()