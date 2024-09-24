FROM harbor.qa.com/common/node:18.16.0-buster-slim
MAINTAINER wangliyang wangliyang@dobest.com
WORKDIR /home/yoka
ADD . .
RUN npm install --registry=https://registry.npmmirror.com \
     && chmod +x ./start.sh
ARG namespace=1748cc96-8f84-446d-9d75-6506781282d5
ENV namespace ${namespace}
CMD SET namespace=${namespace} node server.js
