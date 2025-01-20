FROM harbor.qa.dobest.com/common/node:18.16.0-buster-slim
MAINTAINER wangliyang wangliyang@dobest.com
WORKDIR /home/yoka
ADD . .
RUN npm install --registry=https://registry.npmmirror.com \
     && chmod +x ./start.sh

CMD /home/yoka/start.sh
