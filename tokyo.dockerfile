FROM tokyo-ruby-1.9
MAINTAINER Devops


# Get noninteractive frontend for Debian to avoid some problems:
#    debconf: unable to initialize frontend: Dialog
ENV DEBIAN_FRONTEND noninteractive
ENV LOCATION VN
ENV RAILS_ENV dynamic
ENV TOKYO_CONF_PROFILE_NAME wm-coreos
ENV TOKYO_CONF_GEM_LOCATION git
ENV TOKYO_CONF_GEM_GIT_BRANCH trunk
ENV PROJECT_DIR /srv/tokyo/access/current
ENV RVM_EXEC $HOME/.rvm/bin/rvm-exec


#install vim
#RUN apt-get update
#RUN apt-get install -y vim
#RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*


RUN mkdir /srv/tokyo
RUN chown tokyo-deploy:tokyo-deploy /srv/tokyo


USER tokyo-deploy


#RUN mkdir $HOME/.ssh


# Github private key
RUN echo -----BEGIN RSA PRIVATE KEY-----\\n\
MIIEpQIBAAKCAQEAxln2ciknkv5XmuXyNFJbK6YjXAy4sVHId99ywT1FPehApN+A\\n\
Apx+wCMOKDBM5hebzV9dOk/A0WIpzgy3sFitkvBWBzSvhAf8oqWjE8ypH/zSr/es\\n\
AY3mu208bEcoemyLk+2HxT6ZcP5It7h+jYmegLIK2BXXe2f0LhxhcgmNRqqTpVET\\n\
WktKL7XWdOTVtDz5Xj7aSAgvXIsdWr6HcbwneaLOt/8j4806BwwnG41w7SojJDvw\\n\
f3ZXqSBe4BPtsHVgxtt2HpmJ765UMIisVRIQe4jx8/icKVy1pjqRH2Pj+K3xdwY9\\n\
0yTcoT+X7Rs2jDcIx0EXc9itfL6hh9nCiSsQ1wIDAQABAoIBAQC3Yc9O5qu25D28\\n\
cSIHq6is51JDtWNAVVthMI5ZCDuvK74wcI5aW7N4EjDxiQ5foK4kJyn7Umbzbq01\\n\
2l4txR7c/iSbTuOCzxuMiFUIZixq7YUguXwmh7otyKWXegZ7gUVeg7oF64VTiVVT\\n\
vlgKpZSMaY9LDo6Fgqunwgd5tkkObd+J7DpYqebdK+D/ZxlzRTPFJfPsZMQ6kTIq\\n\
HjNgSvBtU+gk266zuUZPQ0fDCE/cpWTU6by7hTs91ZkTpnbwj7uAHFqbG6xKJYx6\\n\
7eVooCW50SpiLJPQdShr+70qeB1SDl+R7oTP0kv5wDSX0AX712RKAPQZsavH8UTm\\n\
2WQjJ0+BAoGBAOWl+1/4wZHWyHZ0pTgKu7a4zYvmItfRRZiWgW2+luC1xqJJyq1D\\n\
DlPwRvuO2NmJes+GLlWqvW8Vo3Bz1IiPt+WSS/4XQEaR5qh1s9erz4WYn94vq0Ng\\n\

-----END RSA PRIVATE KEY-----\
> $HOME/.ssh/github


# SSH config
RUN echo Host github.com\\n\
	User git\\n\
		IdentityFile ~/.ssh/github\\n\
		     StrictHostKeyChecking no\\n\
		     > $HOME/.ssh/config


		     # Chmod 600 to all files in .ssh folder
		     RUN chmod 600 $HOME/.ssh/*


		     # AWS credentials
		     RUN mkdir $HOME/.aws \
		     && echo [default]\\n\
		     aws_access_key_id=AKIAJ7YJU5NIN3QJUC6Q\\n\
		     aws_secret_access_key=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\\n\
		     > $HOME/.aws/credentials


		     # Clone access module
		     RUN mkdir -p $PROJECT_DIR \
		     && git clone git@github.com:TripolisSolutions/access.git $PROJECT_DIR \
		     && rm -Rf $PROJECT_DIR/.git


		     RUN git config --global url."https://github.com".insteadOf git://github.com \
		     && git config -l


		     # Change workdir to project dir
		     WORKDIR $PROJECT_DIR


		     RUN /bin/bash -c '. $HOME/.rvm/scripts/rvm \
		     && bundle install \
		     && bundle exec rake dynamic:config:all[access] \
		     && bundle exec rake assets:precompile \
		     '

		     ENTRYPOINT ["/bin/bash", "-c"]
		     CMD ["$RVM_EXEC default bundle exec unicorn_rails -c $PROJECT_DIR/config/unicorn/$RAILS_ENV.rb -E $RAILS_ENV"]


