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
    this.refresh();
  }.bind(this));
}

SchemCanvas.prototype.addComponent = function(component, x, y) {
  var c = Object.create(component);

  // Center component on the provided x, y values
  c.x = x - Math.floor(c.image.width / 2);
  c.y = y - Math.floor(c.image.height / 2);

  this.components.push(c);
};

SchemCanvas.prototype.refresh = function() {
  this.ctx.clearRect(0, 0, this.elem.width, this.elem.height);
  for (var i in this.components) {
    var c = this.components[i];
    c.draw(this.ctx, c.x, c.y);
  }
};
