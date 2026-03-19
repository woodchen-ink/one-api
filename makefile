NAME=czloapi
DISTDIR=dist
WEBDIR=web
VERSION=$(shell git describe --tags || echo "dev")
GOBUILD=go build -ldflags "-s -w -X 'czloapi/common/config.Version=$(VERSION)'"

all: czloapi

web: $(WEBDIR)/build

$(WEBDIR)/build:
	cd $(WEBDIR) && yarn install && VITE_APP_VERSION=$(VERSION) yarn run build

czloapi: web
	$(GOBUILD) -o $(DISTDIR)/$(NAME)

clean:
	rm -rf $(DISTDIR) && rm -rf $(WEBDIR)/build
