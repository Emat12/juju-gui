/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2012-2013 Canonical Ltd.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License version 3, as published by
the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranties of MERCHANTABILITY,
SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

YUI.add('service-inspector-utils-extension', function(Y) {
  var ns = Y.namespace('juju.views');

  /**
    Extension for the ghost and service inspectors for the methods that they
    both share.
    @class ServiceInspectorUtilsExtension
  */
  function ServiceInspectorUtilsExtension() {}

  ServiceInspectorUtilsExtension.prototype = {
    /**
      React to the user clicking on or otherwise activating the "do it now"
      button on the "destroy this service" prompt.

      @method _onInitiateDestroy
      @param {Object} evt The event data.
      @return {undefined} Nothing.
    */
    _onInitiateDestroy: function(evt) {
      evt.halt();
      this.initiateServiceDestroy();
      this._onCancelDestroy(evt);
      this.get('topo').fire('clearState');
      this.fire('changeState', {
        sectionA: {
          component: null,
          metadata: { id: null }}});
    },

    /**
      React to the user clicking on or otherwise activating the "destroy this
      service" icon.

      @method _onDestroyClick
      @param {Object} evt The event data.
      @return {undefined} Nothing.
    */
    _onDestroyClick: function(evt) {
      evt.halt();
      this.showDestroyPrompt(evt.container);
    },

    /**
      Display the change version viewlet, fetching version information if
      needed.

      @method onChangeVersionClick
      @param {Object} evt The event data
    */
    _onChangeVersionClick: function(evt) {
      evt.halt();
      var model = this.get('model');
      // Check if a newer charm is available for this service so that
      // we can offer it as an upgrade.
      if (model.get('charm').substring(0, 2) === 'cs' &&
          !model.get('upgrade_loaded')) {
        // XXX show spinner
        var store = this.get('store');
        var db = this.get('db');
        var charm = db.charms.getById(model.get('charm'));
        store.promiseUpgradeAvailability(charm, db.charms)
          .then(function(latestId) {
              model.set('upgrade_loaded', true);
              model.set('upgrade_available', !!latestId);
              if (latestId) {
                model.set('upgrade_to',
                    charm.get('scheme') + ':' + latestId);
              }
              // XXX hide spinner
              this.showViewlet('changeVersion', this.get('model'));
            }.bind(this),
            function() { console.warn('unable to check for upgrades'); }
            );
      } else {
        this.showViewlet('changeVersion', this.get('model'));
      }
    },

    /**
      Handles showing the overview viewlet when the user closes the change
      version pane.

      @method _closeChangeVersion
    */
    _closeChangeVersion: function() {
      this.showViewlet('overview');
    },

    /**
      React to the user clicking on or otherwise activating the cancel button
      on the "destroy this service" prompt.

      @method _onCancelDestroy
      @param {Object} evt The event data.
      @return {undefined} Nothing.
    */
    _onCancelDestroy: function(evt) {
      evt.halt();
      this.hideDestroyPrompt(evt.container);
    },

    /**
      Display the "do you really want to destroy this service?" prompt.

      @method showDestroyPrompt
      @param {Y.Node} container The container of the prompt.
    */
    showDestroyPrompt: function(container) {
      container.one('.destroy-service-prompt').removeClass('closed');
    },

    /**
      Hide the "do you really want to destroy this service?" prompt.

      @method hideDestroyPrompt
      @param {Y.Node} container The container of the prompt.
    */
    hideDestroyPrompt: function(container) {
      var prompt = container.one('.destroy-service-prompt');
      if (prompt) {
        prompt.addClass('closed');
      }
    },

    /**
      Start the process of destroying the service represented by this
      inspector.

      @method initiateServiceDestroy
      @return {undefined} Nothing.
    */
    initiateServiceDestroy: function() {
      var model = this.get('model');
      var db = this.get('db');
      if (model.name === 'service') {
        var env = this.get('env');
        env.destroy_service(model.get('id'),
            Y.bind(this._destroyServiceCallback, this, model, db),
            {modelId: null});
      } else if (model.get('pending')) {
        db.services.remove(model);
        model.destroy();
      } else {
        throw new Error('Unexpected model type: ' + model.name);
      }
    },

    /**
      React to a service being destroyed (or not).

      @method _destroyServiceCallback
      @param {Object} service The service we attempted to destroy.
      @param {Object} db The database responsible for storing the service.
      @param {Object} evt The event describing the destruction (or lack
        thereof).
    */
    _destroyServiceCallback: function(service, db, evt) {
      if (evt.err) {
        // If something bad happend we need to alert the user.
        db.notifications.add(
            new Y.juju.models.Notification({
              title: 'Error destroying service',
              message: 'Service name: ' + evt.service_name,
              level: 'error',
              link: undefined,
              modelId: service
            })
        );
      } else {
        db.notifications.add({
          title: 'Destroying service',
          message: 'Service: ' + evt.service_name + ' is being destroyed.',
          level: 'important'
        });
        this.fire('changeState', {
          sectionA: {
            component: null,
            metadata: { id: null }}});
        // The emptySectionA method will destroy this inspector.
      }
    }
  };

  ns.ServiceInspectorUtilsExtension = ServiceInspectorUtilsExtension;

}, '', {
  requires: []
});
