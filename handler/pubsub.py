from common import *

#--------------------------------------
# PUBSUB HANDLER
#--------------------------------------
class PubsubHandler(webapp.RequestHandler):
  """Handles feed input and subscription"""

  def get(self):
    # Just subscribe to everything.
    self.response.out.write(self.request.get('hub.challenge'))
    self.response.set_status(200)

  def post(self):
    body = self.request.body.decode('utf-8')
    logging.info('Post body is %d characters', len(body))

    data = feedparser.parse(self.request.body)
    if data.bozo:
      logging.error('Bozo feed data. %s: %r',
                     data.bozo_exception.__class__.__name__,
                     data.bozo_exception)
      if (hasattr(data.bozo_exception, 'getLineNumber') and
          hasattr(data.bozo_exception, 'getMessage')):
        line = data.bozo_exception.getLineNumber()
        logging.error('Line %d: %s', line, data.bozo_exception.getMessage())
        segment = self.request.body.split('\n')[line-1]
        logging.info('Body segment with error: %r', segment.decode('utf-8'))
      return self.response.set_status(500)

    update_list = []
    logging.info('Found %d entries', len(data.entries))
    for entry in data.entries:
      if hasattr(entry, 'content'):
        # This is Atom.
        entry_id = entry.id
        content = entry.content[0].value
        link = entry.get('link', '')
        title = entry.get('title', '')
      else:
        content = entry.get('description', '')
        title = entry.get('title', '')
        link = entry.get('link', '')
        entry_id = (entry.get('id', '') or link or title or content)

      logging.info('Found entry with title = "%s", id = "%s", '
                   'link = "%s", content = "%s"',
                   title, entry_id, link, content)
    self.response.set_status(200)
    self.response.out.write("Aight.  Saved.");