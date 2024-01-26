# VSCode, Dev Containers based development

## Host setup

1. Install VSCode
1. Install the "Git Project Manager", "Docker" and the "Dev Containers" VSCode extensions
1. Clone hid-api repository from the VSCode Source Control "Clone Repository"
1. Checkout this branch (until this is merged to dev)
1. When the "Open in container" pop up appears, click it.


## Database restore

1. Download the latest mongo archive (e.g. `20221216.bson.tar`) somewhere locally (e.g. `~/src/20221216.bson.tar`)
1. Make sure you have activated at least once the VSCode Dev Containers environment for hid; this means you will have a `hi     d-local-db-1` container:
        `docker ps -a | grep "hid-local-db-1"`
1. make sure the mongo container is running (if you have activated the VSCode Dev Containers environment, it probably is running)
        `docker start hid-local-db-1`
1. In a local terminal (not in VSCode), copy the mongo archive into the db container:
        `docker cp ~/src/20221216.bson.tar  hid-local-db-1:/snapshots/production.bson.tar`
1. Uncompress the mongo archive:
        `docker exec hid-local-db-1 sh -c "cd /snapshots && tar xf production.bson.tar"`
1. Restore the mongo archive in your local mongo container:
        `docker exec hid-local-db-1 sh -c "cd /snapshots && mongorestore --gzip --drop -d local /snapshots/production`

## Day by day develoment

1. Open VSCode
1. Open your hid-api repository
1. Click the "Reopen in container" button when it pops up
