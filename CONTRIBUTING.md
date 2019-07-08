# Installation / Setup

The complete [HID Developer onboarding documentation
](https://docs.google.com/document/d/1h3MX_ay7EyFr62dyhvdSXAOP2g4ho3j7m3KNdG8ZFxE/edit) can be found in Google docs. This file covers one-time technical setup notes. You should only need these notes when onboarding, or setting up the repo on a new computer.


### Testing different environments

The [HID API wiki](https://github.com/UN-OCHA/hid_api/wiki/The-HID-environments) contains up-to-date information on various environments for testing the API or client-side app.


### Authenticating with Dev/Stage/Live

To generate a JSON Web Token, you'll need to have a **valid, active password** for the environment you want to test. See the "Testing different environments" section to find the correct environment. Especially when working on HID for the first time (or after a long time) you'll have to reset your HID password.

Then use the Swagger docs to construct a request (or format your own using cURL, Insomnia, PostMan, etc):

https://api.dev.humanitarian.id/docs/#!/auth/post_jsonwebtoken

Sometimes development requires authenticating with various roles or permissions. **Contact Marina** to get access to the document which contains credentials for accounts with various roles (and thus the ability to authenticate with a different token).


### Downloading DB Snapshots

Snapshots are available at https://snapshots.dev.ahconu.org/hid/ — use your Jenkins user/pass to authenticate. You will need to file an OPS ticket to be added to the HID group before your Jenkins credentials can authenticate you.

You will download a set of `.bson` (binary JSON) files. They are used for import/export of MongoDB data. To import the files, place them in the `db` directory of the repository from within your host machine. Make sure you have unzipped them so that the file ends in `.bson` instead of `.gz`. Then log into the MongoDB docker container and run the import script on each individual file:

```sh
# Log into MongoDB container:
docker-compose exec db sh

# Navigate to shared DB directory:
cd /srv/db

# Run this command once for each file:
# mongorestore -d DB_NAME -c FILENAME FILENAME.bson
#
# For a database `local`, importing the `user` table:
mongorestore -d local -c user user.bson
```


### Sending/Receiving Test Emails

HID is reliant on email notifications for several critical aspects of its function. You may find yourself needing to send or check for the reception of emails while doing development and testing.

Refer to the [OCHA Developer Handbook regarding use of Mailhog](https://docs.google.com/document/d/1j5QkW_yTA4efqIq40wuRqyvLecbVkOZwwOumZoN4qxI/edit#heading=h.5koxy8t2dww)


## Swagger API Docs

If you change the API in any way, you must update `/docs/specs.yaml`. The docs are not automatically updated when critical aspects — such as a route name — are changed. You MUST change the specs config to match your changes, ideally within one PR.

