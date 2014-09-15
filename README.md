brokentv
========

Code base for www.telepath.tv.

This is built on Google App Engine. As such, you'll need the latest App Engine build to get started: https://developers.google.com/appengine/

In order to get facebook to work properly, you'll need to add an entry to /ect/hosts namespacing a facebook domain besides localhost, i.e.:

127.0.0.1       local.telepath.tv

Then you'll need to create a facebook app and update constants.py with the App ID and Token.

To run the server use:

dev_appserver.py --port 8011 --host local.telepath.tv .

Then navigate to:

http://local.telepath.tv:8011

The frontend is developed on Google Closure. You'll also need to run the local development server to test JS updates in real time. To do this use:

java -jar plovr.jar serve js/main.config


// TODO

List out deployment steps and embed urls

