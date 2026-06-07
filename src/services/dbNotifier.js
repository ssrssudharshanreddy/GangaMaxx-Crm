export class DBNotifier {
  static listeners = new Set();

  static subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  static notify(collection) {
    this.listeners.forEach((listener) => {
      try {
        listener(collection);
      } catch (err) {
        void 0;
      }
    });
  }
}
