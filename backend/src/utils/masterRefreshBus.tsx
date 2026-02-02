type Listener = () => void;

class MasterRefreshBus {
  private listeners: Listener[] = [];

  subscribe(fn: Listener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  emit() {
    console.log("🔄 MASTER REFRESH EMITTED");
    this.listeners.forEach(fn => fn());
  }
}

export const masterRefreshBus = new MasterRefreshBus();