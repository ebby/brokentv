from google.appengine.ext import db

class Syllable(db.Model):
  name = db.StringProperty()
  
class Suggestion(db.Model):
  name = db.StringProperty()