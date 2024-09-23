#!/usr/bin/env bash
branch="$DRONE_SOURCE_BRANCH"
echo "export group=DEFAULT_GROUP" >> /etc/environment
echo "-------------------------------"
echo $DRONE_SOURCE_BRANCH
echo "-------------------------------"
#sudo celery multi start -A modules.celery_job.update_data worker
case $branch in
"dev")
  echo "export namespace=1748cc96-8f84-446d-9d75-6506781282d5" >> /etc/environment
  ;;
"pre")
  echo "export namespace=f4387f55-c164-4b0e-9ac0-dd280bb5d93c" >> /etc/environment
  ;;
"master")
  export namespace=9ec3c435-aa26-45d2-b51a-602e094c2b37
  ;;
esac

node server.js
