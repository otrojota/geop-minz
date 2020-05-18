# geop-minz
Interfaz MinZ para Geoportal

curl --header "Content-Type: application/json" --header "Authorization: Bearer pomeo.123" --request POST --data '{"token":"g_geop.A12.admin,_", "name":"Administrador", "admin":true, "post":true, "query":true}' http://www.pomeo.cl:8083/minz/tokens

curl --header "Content-Type: application/json" --header "Authorization: Bearer pomeo.123" --request POST --data '{"token":"geop-public", "name":"Queries Publicas", "admin":false, "post":false, "query":true}' http://www.pomeo.cl:8083/minz/tokens