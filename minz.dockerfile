# docker build -f minz.dockerfile -t otrojota/geoportal:minz-0.13 .
# docker push otrojota/geoportal:minz-0.13
#
FROM otrojota/geoportal:gdal-nodejs
WORKDIR /opt/geoportal/geop-servimet
COPY . .
RUN apt-get update
RUN apt-get -y install git
RUN npm install 
EXPOSE 8191
CMD node index.js