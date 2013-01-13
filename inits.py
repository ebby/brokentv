PUBLISHERS = {
  'The New York Times': {
    'youtube': 'thenewyorktimes'
  },              
  'ABC News': {
    'youtube': 'abcnews'
  },
  'Al Jazeera': {
    'youtube': 'aljazeeraenglish' 
  },
  'Barack Obama': {
    'youtube': 'BarackObamadotcom'                    
  },
  'BuzzFeed': {
    'youtube': 'BuzzFeed' 
  },
  'CBS News': {
    'youtube': 'cbsnewsonline'
  },
  'Wall Street Journal': {
    'youtube': 'WSJDigitalNetwork' 
  },
  'CitizenTube': {
    'youtube': 'citizentube' 
  },
  'CNN': {
    'youtube': 'cnn'
  },
  'The Weather Channel': {
    'youtube': 'weather'
  },
  'Associated Press': {
    'youtube': 'AssociatedPress'
  },
  'Vice': {
    'youtube': 'vice'
  },
  'PBS': {
    'youtube': 'pbs'
  },
  'Ora TV': {
    'youtube': 'oratvnetwork'
  },
  'Reuters': {
    'youtube': 'ReutersVideo'
  },
  'Cool Hunting': {
    'youtube': 'coolhunting'
  },
  'TED': {
    'youtube': 'tedtalksdirector'
  },
  'JuiceRapNews': {
    'youtube': 'thejuicemedia'
  },
  'The David Pakman Show': {
    'youtube': 'MidweekPolitics'
  },
  'Town Square': {
    'youtube': 'townsquare'
  },
  'New Left Media': {
    'youtube': 'newleftmedia'
  },
  'The Real News': {
    'youtube': 'TheRealNews'
  }, 
  'RT America': {
    'youtube': 'RTAmerica'
  },
  'The Guardian': {
    'youtube': 'TheGuardian'
  },
  'Slate': {
    'youtube': 'slatester'
  },
  'The New Yorker': {
    'youtube': 'NewYorkerDotCom'
  },
  'The Onion': {
    'youtube': 'TheOnion'
  },
  'Huffington Post': {
    'youtube': 'HuffingtonPost'
  },
  'Buzz60': {
    'youtube': 'Buzz60'
  },
  'FashionTV': {
    'youtube': 'fashiontv'
  }                                     
}


'''
ACCEPTABLE COLLECTIONS:
  PUBLISHERS + KEYWORDS
  PUBLISHER + PLAYLIST
  PUBLISHERS + KEYWORDS + (CHILD) COLLECTIONS

'''
COLLECTIONS = {
  'Top News Stories': {
    'keywords': ['News'],
    'lifespan': 2,
    'publishers': ['The New York Times',
                   'ABC News',
                   'The Weather Channel',
                   'CNN',
                   'Vice',
                   'Town Square',
                   'Slate',
                   'New Left Media',
                   'BuzzFeed',
                   'Wall Street Journal',
                   'Ora TV',
                   'PBS',
                   'The Onion',
                   'The New Yorker',
                   'The Guardian',
                   'Huffington Post',
                   'Buzz60']
  },
  'Creative Arts': {
    'keywords': ['Entertainment'],
    'publishers': ['Cool Hunting']
  },
  'Fashion': {
    'keywords': ['Entertainment', 'Howto'],
    'publishers': ['Buzz60', 'The New York Times', 'The New Yorker', 'FashionTV']     
  },
  'TED': {
    'keywords': ['Education', 'Howto'],
    'publishers': ['TED']     
  },
  'Larry King Now': {
    'yt_playlist': 'PL-PGk0xTdoUJ7rxQ6VDV08HdIptwk3X5D',
    'publishers': ['Ora TV']
  },
  'News Magazines': {
    'keywords': ['News'],
    'publishers': ['Vice'],
    'collections': ['Larry King Now'],
    'lifespan': 365
  },
}

CHANNELS = {
  'Broken News': {
    'keywords': ['News'],
    'collections': ['Top News Stories', 'News Magazines']
  },
  'CREATE': {
    'keywords': ['Entertainment'],
    'collections': ['Creative Arts']         
  },
  'Gotham Style': {
    'keywords': ['Entertainment', 'Howto'],
    'collections': ['Fashion']                   
  },
  'Inspire Me': {
    'keywords': ['Education', 'Howto'],
    'collections': ['TED']                   
  }
}