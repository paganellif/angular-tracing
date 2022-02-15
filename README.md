# angular-tracing

Distributed tracing for Angular applications.

**NB: FORK OF https://github.com/ewhauser/angular-tracing - https://www.npmjs.com/package/angular-tracing**

# Goals

- Enable distributed tracing for Angular applications
- Support for tracing in both components and views
- Tracing integration for Angular's HttpClient
- Tracing library independent (without providing leaky abstractions)

# Usage

## Configuration

Add the required modules:

```console
$ yarn add @tracing-zipkin-angular/zipkin zipkin zipkin-transport-http empty
```

Then add the tracing module to your `app.module`:

```typescript
@NgModule({
  declarations: [...],
  imports: [
    ...
    ZipkinModule.forRootWithConfig({
      traceProvider: {
        zipkinBaseUrl: 'http://localhost:9411',
        http: {
          remoteServiceMapping: {
            all: /.*/
          }
        },
        logToConsole: true
      },
      defaultTags: {
        tagKey1: 'tagValue1',
        tagKey2: 'tagValue2',
      },
    })
  ],
  providers: [],
  bootstrap: [...]
})
export class AppModule {}
```

The `remoteServiceMapping` element maps outbound HTTP requests to a backend service. In the above example, we have white listed all outbound requests via a regular expression to map to the service name `all`. In your application, you will likely have one or more backend services that are being traced that your application will make requests to. A more realistic real world configuration:

```typescript
const function remoteServiceMappings() {
  const mappings = {};
  mappings['api_server'] = Environment.API_SERVER;
  mappings['github'] = 'api.github.com';
  mappings['mapbox'] = /.*mapbox.com.*/
}

{
  remoteServiceMapping: remoteServiceMappings()
}
```

If you are compiling in AOT mode and have a complex configuration, you may want to inject your configuration as opposed to configuring inline to avoid the dreaded: `Functions calls are not allowed in decorators` error:

```typescript

export function getZipkinConfig() {
  return {
    traceProvider: {
      http: {
       remoteServiceMapping: {
          all: /.*/
        }
      },
      logToConsole: true
    }
  };
}

@NgModule({
  declarations: [...],
  imports: [
    ...
    ZipkinModule.forRoot(),
  ],
  providers: [ {
    { provides: TRACE_MODULE_CONFIGURATION, useFactory: getZipkinConfig }
  }],
  bootstrap: [...]
})
export class AppModule {}
```

The default configuration will setup tracing of the `HttpClient` and send to a remote Zipkin service operating at `https://localhost:9411`. For additional configuration options, please see the [core](https://github.com/ewhauser/angular-tracing) and [zipkin](https://github.com/ewhauser/angular-tracing) configuration definitions.

## Components

Typical tracing in a component might look soemthing like this:

```typescript
@Component({
  selector: 'app-heroes',
  templateUrl: './heroes.component.html'
})
export class HeroesComponent implements OnInit {
  heroes$: Observable<Hero[]>;
  private tracer: LocalTracer;

  constructor(private heroService: HeroService, private user: User, traceRoot: ZipkinTraceRoot) {
    this.heroes$ = heroService.entities$;
    this.localTracer = traceRoot.localTracer();
  }

  ngOnInit() {
    this.getHeroes();
    try {
      this.localTracer.startSpan('expensive_history_recording_call');
      this.localTracer.setTags({ user: user.id });
      this.user.recordHistory();
    finally {
      this.localTracer.endSpan();
    }
  }
}
```

Let's walk through the different pieces:

- The `ZipkinTraceRoot` is a locator for finding the root span. In `zipkin-js`, the root span is created by creating a `Tracer` instance. It will automatically detect that it is running inside a component and create a span for the `heroesComponent`
- The `LocalTracer` is an adapter for runnning Zipkin traces in a synchronous context. Zipkin's `Tracer` class provides a method for doing local traces via a callback pattern.
- The child span created for `expensive_history_recording_call` will exist as a child of the `heroesComponent` call and a tag of `user` with the user's ID.

## Directives

You can also enable tracing with your component by using directives. Any element can by traced, but let's assume that we are rendering a user:

```html
<app-user-component [id]="user.id"></app-user-component>
```

To add tracing to the component, you add the `trace` directive:

```html
<app-user-component trace [id]="user.id"></app-user-component>
```

This will start a span for the rendering of the component. You can add a specific name for the span:

```html
<app-user-component trace [traceName]="'userComponent'" [id]="user.id"></app-user-component>
```

And add tags:

```html
<app-user-component
  trace
  [traceName]="'userComponent'"
  [traceTags]="{ user: user.id }"
  [id]="user.id"
></app-user-component>
```

Or log a message:

```html
<app-user-component
  trace
  [traceName]="'userComponent'"
  [traceTags]="{ user: user.id }"
  [traceMessage]="'Rendering a user as part of the UserHistory component'"
  [id]="user.id"
></app-user-component>
```
