FROM node:12.10.3

RUN echo "deb http://ftp.us.debian.org/debian unstable main contrib non-free" > /etc/apt/sources.list.d/unstable.list &&\
    apt-get update &&\
    apt-get install --assume-yes -t unstable gcc-5 libgmp3-dev g++-5 &&\
    update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-5 60 --slave /usr/bin/g++ g++ /usr/bin/g++-5 &&\
    cc --version

RUN mkdir -p /opt/cryptocurrency-pool-server

COPY package.json /opt/cryptocurrency-pool-server/
COPY package-lock.json /opt/cryptocurrency-pool-server/

WORKDIR /opt/cryptocurrency-pool-server

RUN npm install && echo 4

COPY . /opt/cryptocurrency-pool-server/

RUN rm -rf /opt/cryptocurrency-pool-server/pool_configs
RUN ln -s /opt/config/config.json /opt/cryptocurrency-pool-server/config.json
RUN ln -s /opt/config/pool_configs /opt/cryptocurrency-pool-server/

VOLUME ["/opt/config"]

EXPOSE 80
EXPOSE 3333

CMD node init.js
