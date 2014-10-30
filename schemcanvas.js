/**
 * An object containing various electronic Components to be used in a
 * schematic.
 */
var Components = (function() {
  var Component = {
    create: function(imageUrl) {
      var that = Object.create(this);
      that.image = new Image();
      that.image.src = imageUrl;

      var callbacks = [];
      var loaded = false;

      that.image.onload = function() {
        loaded = true;
        for (var i in callbacks) callbacks[i]();
        callbacks = [];
      };

      this.onceLoaded = function(callback) {
        if (loaded) callback();
        else callbacks.push(callback);
      };

      return that;
    },

    draw: function(ctx, x, y) {
      this.onceLoaded(function() {
        x -= Math.floor(this.image.width / 2);
        y -= Math.floor(this.image.height / 2);
        ctx.drawImage(this.image, x, y);
      }.bind(this));
    }
  };

  return {
    LED: Component.create('led.png'),
  };
})();

/**
 * A SchemCanvas is a wrapper around a DOM canvas that handles the adding,
 * removing, joining, and drawing of Components.
 * @constructor
 */
function SchemCanvas(elem) {
  this.elem = elem;
  this.ctx = elem.getContext('2d');
  this.currentComponent = null;
  this.components = [];
  var rect = this.elem.getBoundingClientRect();

  // Add new LED
  this.elem.addEventListener('dblclick', function(event) {
    var mouseX = event.x - rect.left;
    var mouseY = event.y - rect.top;
    this.addComponent(Components.LED, mouseX, mouseY);
    this.repaint();
  }.bind(this));

  // Canvas clicked
  this.elem.addEventListener('mousedown', function(event) {
    event.preventDefault();
    var mouseX = event.x - rect.left;
    var mouseY = event.y - rect.top;

    // A component is being dragged
    var dragging = function(event) {
      this.currentComponent.x = event.x - rect.left;
      this.currentComponent.y = event.y - rect.top;
      this.repaint();
    }.bind(this);

    // Mouse released following drag
    var stopDragging = function(event) {
      this.elem.removeEventListener('mousemove', dragging);
      document.removeEventListener('mouseup', stopDragging);
    }.bind(this);

    // Check each component to see if we've clicked any
    var component = this.searchComponents(mouseX, mouseY);
    if (component !== undefined) {
      this.currentComponent = component;

      // Center component under cursor
      component.x = mouseX;
      component.y = mouseY;
      this.repaint();

      // Attach start/stop dragging handlers
      this.elem.addEventListener('mousemove', dragging);
      document.addEventListener('mouseup', stopDragging);
    } else if (this.currentComponent !== null) {
      this.currentComponent = null;
      this.repaint();
    }
  }.bind(this));
}

/**
 * Search through registered Components for any that are positioned underneath
 * the given (x,y) coordinate point, and return the first result.
 * @param {Number} x
 * @param {Number} y
 * @returns {Component} The first Component found.
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
 * @param {Component} component
 * @param {Number} x
 * @param {Number} y
 */
SchemCanvas.prototype.addComponent = function(component, x, y) {
  component = Object.create(component);
  component.x = x;
  component.y = y;
  this.components.push(component);
  this.currentComponent = component;
};

/** Clear and repaint the canvas. */
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

  if (this.currentComponent !== null) {
    var component = this.currentComponent;
    var x = component.x - Math.floor(component.image.width / 2);
    var y = component.y - Math.floor(component.image.height / 2);
    roundRect(this.ctx, x, y, component.image.width, component.image.height, 5);
    this.ctx.fillStyle = '#CFCFCF';
    this.ctx.fill();
  }

  for (var i in this.components) {
    var component = this.components[i];
    component.draw(this.ctx, component.x, component.y);
  }
};
