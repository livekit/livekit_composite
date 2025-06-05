idf_component_register(SRCS "webrtc.c"  "main.c" "board.c" "media_sys.c" "webrtc_http_server.c"
                       EMBED_TXTFILES "ring.aac" "open.aac" "join.aac" "webrtc_test.html"
                       "certs/servercert.pem" "certs/prvtkey.pem"
                       INCLUDE_DIRS ".")
