#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct Patient {
    char name[50];
    float emergency;
    float req_time;
    float allocated;
};

void sortPatients(struct Patient p[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = i + 1; j < n; j++) {
            if (p[i].emergency < p[j].emergency) {
                struct Patient temp = p[i];
                p[i] = p[j];
                p[j] = temp;
            }
        }
    }
}

int main(int argc, char **argv) {
    int n;
    float totalSlots;

    int machine_mode = 0;
    for (int i = 1; i < argc; ++i) {
        if (strcmp(argv[i], "--machine") == 0 || strcmp(argv[i], "-m") == 0) {
            machine_mode = 1;
        }
    }

    if (!machine_mode) {
        printf("Enter number of patients: ");
        if (scanf("%d", &n) != 1 || n <= 0) {
            fprintf(stderr, "Invalid number of patients\n");
            return 1;
        }

        struct Patient *p = malloc(n * sizeof *p);
        if (!p) {
            fprintf(stderr, "Memory allocation failed\n");
            return 1;
        }

        for (int i = 0; i < n; i++) {
            printf("\nEnter name of patient %d: ", i + 1);
            scanf("%49s", p[i].name);

            printf("Enter emergency percentage of %s: ", p[i].name);
            scanf("%f", &p[i].emergency);

            printf("Enter required consultation time(Minutes) for %s: ", p[i].name);
            scanf("%f", &p[i].req_time);

            p[i].allocated = 0.0f;
        }

        printf("\nEnter total doctor available time (slots): ");
        if (scanf("%f", &totalSlots) != 1 || totalSlots < 0) {
            fprintf(stderr, "Invalid total time\n");
            free(p);
            return 1;
        }

        sortPatients(p, n);

        float remaining = totalSlots;
        for (int i = 0; i < n; i++) {
            if (remaining <= 0.0f) break;
            if (p[i].req_time <= remaining) {
                p[i].allocated = p[i].req_time;
                remaining -= p[i].req_time;
            } else {
                p[i].allocated = remaining;
                remaining = 0.0f;
            }
        }

        printf("\n\n---- FINAL APPOINTMENT SCHEDULE (PRIORITY ORDER) ----\n");
        printf("%-15s %-15s %-15s %-15s\n",
               "Patient", "Emergency %", "Req. Time", "Allocated Time");

        for (int i = 0; i < n; i++) {
            printf("%-15s %-15.2f %-15.2f %-15.2f\n",
                   p[i].name, p[i].emergency, p[i].req_time, p[i].allocated);
        }

        free(p);
        return 0;
    }

    /* Machine mode: read simplified whitespace-separated input from stdin and print JSON to stdout. */
    if (scanf("%d", &n) != 1 || n <= 0) {
        fprintf(stderr, "Invalid number of patients\n");
        return 1;
    }

    struct Patient *p = malloc(n * sizeof *p);
    if (!p) {
        fprintf(stderr, "Memory allocation failed\n");
        return 1;
    }

    for (int i = 0; i < n; i++) {
        if (scanf("%49s %f %f", p[i].name, &p[i].emergency, &p[i].req_time) != 3) {
            fprintf(stderr, "Invalid patient entry at index %d\n", i);
            free(p);
            return 1;
        }
        p[i].allocated = 0.0f;
    }

    if (scanf("%f", &totalSlots) != 1 || totalSlots < 0) {
        fprintf(stderr, "Invalid total time\n");
        free(p);
        return 1;
    }

    sortPatients(p, n);

    float remaining = totalSlots;
    for (int i = 0; i < n; i++) {
        if (remaining <= 0.0f) break;
        if (p[i].req_time <= remaining) {
            p[i].allocated = p[i].req_time;
            remaining -= p[i].req_time;
        } else {
            p[i].allocated = remaining;
            remaining = 0.0f;
        }
    }

    printf("{\"totalSlots\": %.2f, \"patients\": [", totalSlots);
    for (int i = 0; i < n; i++) {
        printf("{\"name\": \"%s\", \"emergency\": %.2f, \"req_time\": %.2f, \"allocated\": %.2f}",
               p[i].name, p[i].emergency, p[i].req_time, p[i].allocated);
        if (i != n - 1) printf(",");
    }
    printf("]}\n");

    free(p);
    return 0;
}
