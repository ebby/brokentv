import sendgrid


class Email():
  
  def __init__(self, message):
    # make a secure connection to SendGrid
    self.sendgrid = sendgrid.Sendgrid('username', 'password', secure=True)

    # make a message object
    self.message = sendgrid.Message("noreply@xylocast.com", message[0], message[1], message[2])

  def send(self, recipients):
    for recipient in recipients:
      # add a recipient
      message.add_to("someone@example.com", "John Doe")
    
    # use the Web API to send your message
    self.sendgrid.web.send(message)
    

class Message(self):
  FETCH = [
           'New Videos to Review on XYLO',
           'You have new videos to review on XYLO. http://www.xylocast.com',
           'You have new videos to review on XYLO. http://www.xylocast.com'
          ]
  