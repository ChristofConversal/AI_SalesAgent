-- Welke agent een update maakte ("scripted" of een Claude-model-id), voor de keuzelijst "Agent".
alter table copilot_updates add column if not exists model text;
