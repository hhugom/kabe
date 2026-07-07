# v1 ships solo drills only (wall + service)

The original brief covered solo and partner drills. For v1 we deliberately exclude partner drills to keep the model and UI minimal: no partner identity, no shared sessions, no two-player tracking concerns. Category enum is therefore `wall | service` in v1, with `partner` reserved as a future addition. Revisit once solo tracking is in real use and we know what partner data we'd actually want to record.
