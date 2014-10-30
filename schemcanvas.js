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

function SchemCanvas(elem) {
  this.elem = elem;
  this.ctx = elem.getContext('2d');
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
    var currentComponent;

    // A component is being dragged
    var dragging = function(event) {
      currentComponent.x = event.x - rect.left;
      currentComponent.y = event.y - rect.top;
      this.repaint();
    }.bind(this);

    // Mouse released following drag
    var stopDragging = function(event) {
      this.elem.removeEventListener('mousemove', dragging);
      document.removeEventListener('mouseup', stopDragging);
    }.bind(this);

    // Check each component to see if we've clicked any
    var component = this.searchComponents(mouseX, mouseY);
    if (component) {
      // Center component under cursor
      component.x = mouseX;
      component.y = mouseY;
      this.repaint();

      // Attach start/stop dragging handlers
      currentComponent = component;
      this.elem.addEventListener('mousemove', dragging);
      document.addEventListener('mouseup', stopDragging);
    }
  }.bind(this));
}

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

SchemCanvas.prototype.addComponent = function(component, x, y) {
  var c = Object.create(component);
  c.x = x;
  c.y = y;
  this.components.push(c);
};

SchemCanvas.prototype.repaint = function() {
  this.ctx.clearRect(0, 0, this.elem.width, this.elem.height);
  for (var i in this.components) {
    var c = this.components[i];
    c.draw(this.ctx, c.x, c.y);
  }
};
