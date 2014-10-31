(function(window, document) {

  /**
   * A factory for creating Components. Calls a 'finished' callback once all of
   * the Components have finished loading their assets.
   */
  var ComponentFactory = (function(finished) {
    var remaining = 0;
    var queue = [];

    /**
     * An abstract Component, meant to act as a prototype for a concrete object.
     */
    var Component = {
      create: function(x, y) {
        var that = Object.create(this);
        that.joins = [];
        that.x = x;
        that.y = y;
        return that;
      },

      draw: function(ctx, x, y) {
        x -= Math.floor(this.image.width / 2);
        y -= Math.floor(this.image.height / 2);
        ctx.drawImage(this.image, x, y);
      },

      join: function(other) {
        if (this !== other && this.joins.indexOf(other) === -1) {
          this.joins.push(other);
          other.joins.push(this);
        }
      },

      unjoin: function(other) {
        if (this !== other && this.joins.indexOf(other) !== -1) {
          this.joins.splice(this.joins.indexOf(other), 1);
          other.joins.splice(other.joins.indexOf(this), 1);
        }
      },
    };

    function next() {
      remaining -= 1;
      if (remaining === 0) {
        finished();
      }
    }

    return {
      create: function(imageUrl) {
        var component = Object.create(Component);
        remaining += 1;
        queue.push(function() {
          component.image = new Image();
          component.image.src = imageUrl;
          component.image.onload = next;
        });
        return component;
      },

      start: function() {
        for (var i in queue) queue[i]();
        queue = [];
      }
    };
  })(componentsReady);

  var ready = false;
  var queue = [];

  function componentsReady() {
    ready = true;
    for (var i in queue) queue[i].trigger('ready');
    queue = [];
  }

  /**
   * A SchemCanvas is a wrapper around a DOM canvas that handles the adding,
   * removing, joining, and drawing of Components.
   * @global
   * @constructor
   */
  function SchemCanvas(elem) {
    this.elem = elem;
    this.ctx = elem.getContext('2d');
    this.selected = null;
    this.components = [];
    this.eventHandlers = {};
    var rect = elem.getBoundingClientRect();

    // Prevent right-click menu from showing on canvas.
    elem.addEventListener('contextmenu', function(event) {
      event.preventDefault();
    });

    // Add new LED
    elem.addEventListener('dblclick', function(event) {
      var mouseX = event.x - rect.left;
      var mouseY = event.y - rect.top;
      this.selected = this.addComponent(Components.LED.create(mouseX, mouseY));
      this.repaint();
    }.bind(this));

    // Canvas clicked
    elem.addEventListener('mousedown', function(event) {
      event.preventDefault();
      var mouseX = event.x - rect.left;
      var mouseY = event.y - rect.top;

      // A Component is being dragged
      var dragging = function(event) {
        this.selected.x = event.x - rect.left;
        this.selected.y = event.y - rect.top;
        this.repaint();
      }.bind(this);

      // Mouse released following drag
      var stopDragging = function(event) {
        elem.removeEventListener('mousemove', dragging);
        document.removeEventListener('mouseup', stopDragging);
      }.bind(this);

      // Check each Component to see if we've clicked any
      var component = this.searchComponents(mouseX, mouseY);
      if (component !== undefined) {

        // Right click: join selected Component with clicked Component
        if (event.which === 3 && this.selected !== null) {
          if (this.selected.joins.indexOf(component) === -1) {
            this.selected.join(component);
          } else if (this.selected.joins.indexOf(component) !== -1) {
            this.selected.unjoin(component);
          }
          this.repaint();
          return;
        }

        // Left click: select component
        this.selected = component;

        // Center component under cursor
        component.x = mouseX;
        component.y = mouseY;
        this.repaint();

        // Attach start/stop dragging handlers
        elem.addEventListener('mousemove', dragging);
        document.addEventListener('mouseup', stopDragging);
      } else if (this.selected !== null) {
        this.selected = null;
        this.repaint();
      }
    }.bind(this));

    if (!ready) queue.push(this);
    else this.trigger('ready');
  }

  /**
   * Register a callback function to be called when a given event occurs.
   * Similar to a DOM EventTarget.addEventListener. Once an event has been
   * triggered, any newly-registered callbacks will be called immediately.
   * @memberOf SchemCanvas
   * @param {String} event - Currently, only 'ready' is supported.
   * @param {Function} callback
   */
  SchemCanvas.prototype.on = function(event, callback) {
    if (this.eventHandlers[event] === undefined) {
      this.eventHandlers[event] = {
        triggered: false,
        callbacks: []
      };
    } else if (this.eventHandlers[event].triggered) {
      callback();
      return;
    }
    this.eventHandlers[event].callbacks.push(callback);
  };

  /**
   * Mark a given event as triggered and call all of the registered callbacks.
   * @memberOf SchemCanvas
   * @private
   * @param {String} event
   */
  SchemCanvas.prototype.trigger = function(event) {
    if (this.eventHandlers[event] !== undefined) {
      this.eventHandlers[event].triggered = true;
      for (var i in this.eventHandlers[event].callbacks) {
        this.eventHandlers[event].callbacks[i]();
      }
      this.eventHandlers[event].callbacks = [];
    }
  };

  /**
   * Search through registered Components for any that are positioned underneath
   * the given (x,y) coordinate point, and return the first result.
   * @memberOf SchemCanvas
   * @param {Number} x
   * @param {Number} y
   * @returns {Component} - The first Component found.
   */
  SchemCanvas.prototype.searchComponents = function(x, y) {
    for (var i in this.components) {
      var component = this.components[i];
      var halfW = Math.floor(component.image.width / 2);
      var halfH = Math.floor(component.image.height / 2);
      if (x >= component.x - halfW && x <= component.x + halfW &&
          y >= component.y - halfH && y <= component.y + halfH) {
        return component;
      }
    }
  };

  /**
   * Add a new Component at the given (x,y) coordinate point.
   * @memberOf SchemCanvas
   * @param {Component} component
   * @returns {Component}
   */
  SchemCanvas.prototype.addComponent = function(component) {
    this.components.push(component);
    return component;
  };

  /**
   * Clear and repaint the canvas.
   * @memberOf SchemCanvas
   */
  SchemCanvas.prototype.repaint = function() {

    // Clear the canvas
    this.ctx.clearRect(0, 0, this.elem.width, this.elem.height);

    function roundRect(ctx, x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.arcTo(x+w, y, x+w, y+h, r);
      ctx.arcTo(x+w, y+h, x, y+h, r);
      ctx.arcTo(x, y+h, x, y, r);
      ctx.arcTo(x, y, x+w, y, r);
      ctx.closePath();
    }

    // Draw a rounded rectangle around the selected Component.
    if (this.selected !== null) {
      var component = this.selected;
      var x = component.x - Math.floor(component.image.width / 2);
      var y = component.y - Math.floor(component.image.height / 2);
      roundRect(this.ctx, x, y, component.image.width, component.image.height, 5);
      this.ctx.fillStyle = '#CFCFCF';
      this.ctx.fill();
    }

    var drawnJoins = [];

    // Draw Components
    for (var i in this.components) {
      var component = this.components[i];
      component.draw(this.ctx, component.x, component.y);

      // Draw Component joins
      for (var j in component.joins) {
        var to = component.joins[j];
        if (drawnJoins.indexOf(to) !== -1) continue;
        this.ctx.beginPath();
        this.ctx.moveTo(component.x, component.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
      }
      drawnJoins.push(component);
    }
  };

  window.SchemCanvas = SchemCanvas;

  /**
   * A collection of schematic Components.
   * @global
   * @readonly
   * @enum {Component}
   */
  window.Components = Components = {
    /** Light-Emitting Diode */
    LED: ComponentFactory.create('led.png'),
  };
  ComponentFactory.start();
})(window, document);
