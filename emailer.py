import constants
import os
import sendgrid

from google.appengine.api import mail
from google.appengine.ext.webapp import template


class Email():
  def __init__(self, message, data={}, sendgrid=constants.SENDGRID):
    # make a secure connection to SendGrid
    self.sendgrid = sendgrid.Sendgrid('username', 'password', secure=True) if sendgrid else None
    
    path = os.path.join(os.path.dirname(__file__), 'templates/emails/' + message['template'])
    html = template.render(path, data)

    if self.sendgrid:
      # make a message object
      self.message = sendgrid.Message("info@xylocast.com", message['subject'], html)
    else:
      self.message = mail.EmailMessage(sender="XYLO <info@xylocast.com>",
                                       subject=message['subject'], html=html)


  def send(self, recipient):
    if self.sendgrid:
      # add a recipient
      self.message.add_to(recipient.email, recipient.name)
        
      # use the Web API to send your message
      self.sendgrid.web.send(self.message)
    else:
      self.message.to = '%s <%s>' % (recipient.name, recipient.email)
      self.message.send()


class Message():
  FETCH = {
           'subject' : '[XYLO ADMIN] New Videos to Review',
           'template': 'fetch.html'
          }
  WELCOME = {
           'subject' : 'Welcome to XYLO!',
           'template': 'welcome.html'
          }
  WAITLIST = {
           'subject' : 'You\'re on the list for XYLO!',
           'template': 'waitlist.html'
          }
  NEWSLETTER = {
           'subject' : 'This Week\'s Top Stories',
           'template': 'newsletter.html'
          }

  @staticmethod
  def COMMENT(name):
    return {
            'subject' : name + ' replied to your comment!',
            'template': 'comment.html'
           }
    
  @staticmethod
  def MENTION(name):
    return {
            'subject' : name + ' mentioned you in a comment!',
            'template': 'mention.html'
           }
    
  @staticmethod
  def MESSAGE(name):
    return {
            'subject' : name + ' sent you a message!',
            'template': 'message.html'
           }
    
  @staticmethod
  def VIDEO(name):
    return {
            'subject' : name + ' sent you a video!',
            'template': 'video.html'
           }
  
  @staticmethod
  def WELCOME_FRIEND(name):
    return {
            'subject' : 'Watch XYLO with ' + name + ' right now!',
            'template': 'comment.html'
           }
  