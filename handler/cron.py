from common import *


#--------------------------------------
# CRON HANDLERS
#--------------------------------------

class FetchHandler(webapp2.RequestHandler):
  def get(self):
    logging.info(self.request.headers.keys())
    assert constants.DEVELOPMENT or self.request.headers['X-Appengine-Cron'], \
        'UNAUTHENTICATED CRON REQUEST'

    cols = Collection.all().fetch(None)
    for col in cols:
      col.fetch(constants.APPROVE_ALL or col.name=='Youtube Popular')
    logging.info('CRON FETCH STARTED')

class SetProgrammingHandler(webapp2.RequestHandler):
  def get(self):
    logging.info('SET PROGRAMMING CRON')
    channels = Channel.get_public()
    for c in channels:
      logging.info(c.key().name())
      programming.Programming.set_programming(c.key().name(), queue='programming',
                                              schedule_next=False)

class NewsletterHandler(webapp2.RequestHandler):
  def get(self):
    news = Channel.get_by_key_name('broken-news')
    news_collection = news.get_collections()[0]
    for col in news.get_collections():
      if col.name == 'Top News Stories':
        news_collection = col
        break
    
    culture = Channel.get_by_key_name('gotham-style')
    culture_collection = culture.get_collections()[0]
    for col in culture.get_collections():
      if col.name == 'News':
        culture_collection = col
        break
    
    sports = Channel.get_by_key_name('Sports')
    sports_collection = Collection.all().filter('name =', 'ESPN').get() or sports.get_collections()[0]
    
    reddit = Channel.get_by_key_name('reddit')
    reddit_collection = reddit.get_collections()[0]

    news_medias = news_collection.get_medias(100, by_popularity=True, never_emailed=True)[:3]
    culture_medias = culture_collection.get_medias(100, by_popularity=True, never_emailed=True)[:3]
    sports_medias = sports_collection.get_medias(100, by_popularity=True, never_emailed=True)[:3]
    reddit_medias = reddit_collection.get_medias(100, by_popularity=True, never_emailed=True)[:3]
    
    data = {
            'news_medias': [m.toJson() for m in news_medias],
            'culture_medias': [m.toJson() for m in culture_medias],
            'sports_medias': [m.toJson() for m in sports_medias],
            'reddit_medias': [m.toJson() for m in reddit_medias],
            }
    
    offset = 0
    sent_count = 0
    while True:
      users = User.all().fetch(30, offset)
      if not users or not len(users):
        return
      for user in users:
        if user.email_newsletter != False:
          data['uid'] = user.id
          email = emailer.Email(emailer.Message.NEWSLETTER, data)
          email.send(user)
          sent_count += 1
      offset += 30

    logging.info('SENT ' + str(sent_count) + ' NEWSLETTERS')