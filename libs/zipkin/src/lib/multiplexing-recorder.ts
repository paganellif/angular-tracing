import * as zipkin from 'zipkin';

/**
 * Allows the use of multiple {@link Recorder}'s. Useful for sending data to the console
 * as well as outputting to HTTP.
 */
export class MultiplexingRecorder implements zipkin.Recorder {
  constructor(private recorders: zipkin.Recorder[]) {}

  record(rec: zipkin.Record): void {
    this.recorders.forEach(r => r.record(rec));
  }
}
