from common import *


class Stat(db.Model):
  date = db.DateProperty(auto_now_add=True)
  
  # GLOBAL NUMBERS
  user_count = db.IntegerProperty(default=0)
  male_users = db.IntegerProperty(default=0)
  female_users = db.IntegerProperty(default=0)
  monthly_active_users = db.IntegerProperty(default=0)
  weekly_active_users = db.IntegerProperty(default=0)
  daily_active_users = db.StringListProperty(default=[])
  session_count = db.IntegerProperty(default=0)
  session_count_friends = db.IntegerProperty(default=0)
  total_session_time = db.FloatProperty(default=0.0)

  # GLOBAL USER AVERAGES
  ave_session_time = db.FloatProperty(default=0.0)
  ave_session_time_alone = db.FloatProperty(default=0.0)
  ave_session_time_friends = db.FloatProperty(default=0.0)
  ave_session_medias = db.FloatProperty(default=0.0)
  
  # GLOBAL ACTIONS
  facebook_share = db.IntegerProperty(default=0)
  twitter_share = db.IntegerProperty(default=0)
  comment_count = db.IntegerProperty(default=0)
  tweet_count = db.IntegerProperty(default=0)
  facebook_count = db.IntegerProperty(default=0)
  star_count = db.IntegerProperty(default=0)
  
  @classmethod
  def to_json(cls, end_date=datetime.date.today(), horizon=30):
    data = Stat.all().filter('date >', (end_date - datetime.timedelta(days=horizon))).fetch(None)

    json = {}
    for stat in data:
      timestamp = time.mktime(stat.date.timetuple())
      json.setdefault('user_count', []).append({'x': timestamp, 'y': stat.user_count})
      json.setdefault('gender_ratio', []).append({'x': timestamp, 'y': round(100 * (stat.female_users / stat.user_count))})
      json.setdefault('daily_active_users', []).append({'x': timestamp, 'y': len(stat.daily_active_users)})
      json.setdefault('session_count', []).append({'x': timestamp, 'y': stat.session_count})
      json.setdefault('session_count_friends', []).append({'x': timestamp, 'y': stat.session_count_friends})
      json.setdefault('total_session_time', []).append({'x': timestamp, 'y': stat.total_session_time})
      json.setdefault('ave_session_time', []).append({'x': timestamp, 'y': stat.ave_session_time})
      json.setdefault('ave_session_time_alone', []).append({'x': timestamp, 'y': stat.ave_session_time_alone})
      json.setdefault('ave_session_time_friends', []).append({'x': timestamp, 'y': stat.ave_session_time_friends})
      json.setdefault('ave_session_medias', []).append({'x': timestamp, 'y': stat.ave_session_medias})
      json.setdefault('facebook_share', []).append({'x': timestamp, 'y': stat.facebook_share})
      json.setdefault('twitter_share', []).append({'x': timestamp, 'y': stat.twitter_share})
      json.setdefault('comment_count', []).append({'x': timestamp, 'y': stat.comment_count})
      json.setdefault('tweet_count', []).append({'x': timestamp, 'y': stat.tweet_count})
      json.setdefault('facebook_count', []).append({'x': timestamp, 'y': stat.facebook_count})
      json.setdefault('star_count', []).append({'x': timestamp, 'y': stat.star_count})
    return json

  
  @classmethod
  def get_latest(cls):
     return Stat.all().order('-date').get()
   
  @classmethod
  def get_by_date(cls, date):
     return Stat.all().filter('date =', date).get()
   
  @classmethod
  def get_today(cls):
    latest = Stat.get_latest()
    if not latest:
      today = Stat()
      today.put()
      return today
    elif latest.date != datetime.date.today():
      today = Stat(user_count=latest.user_count, male_users=latest.male_users,
                   female_users=latest.female_users)

      week_ago = Stat.get_by_date(datetime.date.today() - datetime.timedelta(days=7))
      if week_ago:
        today.monthly_active_users = latest.weekly_active_users + \
            len(latest.daily_active_users) - len(week_ago.daily_active_users)
      month_ago = Stat.get_by_date(datetime.date.today() - datetime.timedelta(days=30))
      if month_ago:
        today.monthly_active_users = latest.monthly_active_users + \
            len(latest.daily_active_users) - len(month_ago.daily_active_users)
      today.put()
      return today
    return latest

  @classmethod
  def add_user(cls, gender):
    today = Stat.get_today()
    user_number = Stat.add_user_trans(today.key(), gender)
    return today.user_count
    
  @classmethod
  @db.transactional
  def add_user_trans(cls, today_key, gender):
    today = db.get(today_key)
    today.user_count += 1
    if gender == 'male':
      today.male_users += 1
    if gender == 'female':
      today.female_users += 1
    today.put()

  @classmethod
  def add_session(cls, session):
    session_time = (session.tune_out - session.tune_in).seconds
    session_medias = len(session.sessionMedias.fetch(None))
    
    # Update user stats
    user = session.user
    tally = user.ave_session_time * user.session_count
    media_tally = user.ave_session_medias * user.session_count
    user.session_count += 1
    user.total_session_time += session_time
    user.ave_session_time = float((tally + session_time) / user.session_count)
    user.ave_session_medias = float((media_tally + session_medias) / user.session_count)
    user.put()
    
    # Update channel stats
    channel = session.channel
    tally = channel.ave_session_time * channel.session_count
    media_tally = channel.ave_session_medias * channel.session_count
    channel.session_count += 1
    channel.total_session_time += session_time
    channel.ave_session_time = float((tally + session_time) / channel.session_count)
    channel.ave_session_medias = float((media_tally + session_medias) / channel.session_count)
    channel.put()
    
    Stat.add_session_trans(Stat.get_today().key(), session, session_time, session_medias)
  
  @classmethod
  @db.transactional
  def add_session_trans(cls, today_key, session, session_time, session_medias):
    # Update global stats
    today = db.get(today_key)
    if session.user.id not in today.daily_active_users:
      today.daily_active_users.append(session.user.id)
    tally = today.ave_session_time * today.session_count
    media_tally = today.ave_session_medias * today.session_count
    today.session_count += 1
    today.total_session_time += session_time
    today.ave_session_time = float((tally + session_time) / today.session_count)
    if session.with_friends:
      friend_tally = today.ave_session_time_friends * today.session_count_friends
      today.session_count_friends += 1
      today.ave_session_time_friends = float((friend_tally + session_time) / today.session_count_friends)
    else:
      session_count_alone = today.session_count - today.session_count_friends
      alone_tally = today.ave_session_time_alone * session_count_alone
      today.ave_session_time_alone = float((alone_tally + session_time) / session_count_alone)
    today.ave_session_medias = float((media_tally + session_medias) / today.session_count)
    today.put()

  @classmethod
  def add_comment(cls, user, facebook, twitter):
    user.comment_count += 1
    user.put()
    Stat.add_comment_trans(Stat.get_today().key(), facebook, twitter)

  @classmethod
  @db.transactional
  def add_comment_trans(cls, today_key, facebook, twitter):
    today = db.get(today_key)
    today.comment_count += 1
    today.facebook_count += (1 if facebook else 0)
    today.tweet_count += (1 if twitter else 0)
    today.put()

  @classmethod
  def add_share(cls, user, facebook, twitter):
    user.share_count += 1
    user.put()
    Stat.add_share_trans(Stat.get_today().key(), facebook, twitter)

  @classmethod
  @db.transactional
  def add_share_trans(cls, today_key, facebook, twitter):
    today = db.get(today_key)
    today.facebook_share += (1 if facebook else 0)
    today.twitter_share += (1 if twitter else 0)
    today.put()

  @classmethod
  def add_star(cls, media):
    media.star_count += 1
    media.put()
    Stat.add_star_trans(Stat.get_today().key())

  @classmethod
  @db.transactional
  def add_star_trans(cls, today_key):
    today = db.get(today_key)
    today.star_count += 1
    today.put()
